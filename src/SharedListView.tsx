import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { AddListItemForm } from "./AddListItemForm";
import { ListItemCard } from "./ListItemCard";
import { SignInForm } from "./SignInForm";

interface SharedListViewProps {
  shareToken: string;
}

export function SharedListView({ shareToken }: SharedListViewProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const list = useQuery(api.lists.getListByShareToken, { shareToken });
  const listItems = useQuery(api.listItems.getListItems, list ? { listId: list._id } : "skip");
  const userPermissions = useQuery(api.lists.getUserListPermissions, list ? { listId: list._id } : "skip");
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const handleToggleExpand = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  if (list === undefined || userPermissions === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading shared list...</p>
      </div>
    );
  }

  if (!list || !userPermissions || !userPermissions.canView) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don't have permission to view this list, or the list doesn't exist.
        </p>
        {!loggedInUser && (
          <div className="max-w-md mx-auto">
            <p className="text-sm text-gray-500 mb-4">
              Try signing in if you have been invited to this list.
            </p>
            <SignInForm />
          </div>
        )}
      </div>
    );
  }

  if (listItems === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading list items...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-primary mb-2">{list.name}</h2>
        <p className="text-sm text-gray-500">Shared list</p>
      </div>

      {userPermissions.canAdd && <AddListItemForm listId={list._id} />}

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-gray-700">Videos in this List</h3>
        {listItems.length === 0 ? (
          <p className="text-gray-500">
            No videos added to this list yet. 
            {userPermissions.canAdd ? " Use the form above to add one!" : ""}
          </p>
        ) : (
          <div className="space-y-4">
            {listItems.map((item) => (
              <ListItemCard 
                key={item._id} 
                item={item} 
                listOwnerId={list.ownerId}
                userPermissions={userPermissions}
                isExpanded={expandedItemId === item._id}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
