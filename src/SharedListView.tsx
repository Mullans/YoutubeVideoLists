import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
import { AddListItemForm } from "./AddListItemForm";
import { ListItemCard } from "./ListItemCard";

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

  // If logged in user has access, redirect them to the individual list page
  useEffect(() => {
    if (loggedInUser && userPermissions && userPermissions.canView && list) {
      // Redirect to the individual list page
      window.location.href = `/lists/${list._id}`;
    }
  }, [loggedInUser, userPermissions, list]);

  // If list is null, we know access is denied
  if (list === null) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">List Not Available</h2>
        <p className="text-gray-600 mb-4">
          You have tried to access an invalid list. Please ensure that the list exists and you have permission to view it.
        </p>
        <div className="mt-4">
          <a
            href="/"
            className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // If we have a list but still loading permissions
  if (list === undefined || userPermissions === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading shared list...</p>
      </div>
    );
  }

  // If logged in user has access, show loading while redirecting
  if (loggedInUser && userPermissions && userPermissions.canView) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to list...</p>
      </div>
    );
  }

  // If no permissions to view
  if (!userPermissions || !userPermissions.canView) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">List Not Available</h2>
        <p className="text-gray-600 mb-4">
          You have tried to access an invalid list. Please ensure that the list exists and you have permission to view it.
        </p>
        <div className="mt-4">
          <a
            href="/"
            className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover transition-colors"
          >
            Return to Home
          </a>
        </div>
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

  // Show the shared list view for anonymous users only
  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-3xl font-bold text-primary mb-2">{list.name}</h2>
            <p className="text-sm text-gray-500">Shared list</p>
          </div>
          <div className="text-sm text-gray-500">
            <a
              href="/"
              className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors"
            >
              Sign In to Manage
            </a>
          </div>
        </div>
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
