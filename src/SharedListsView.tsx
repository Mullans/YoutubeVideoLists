import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface SharedListsViewProps {
  onSelectList: (listId: Id<"lists">) => void;
}

export function SharedListsView({ onSelectList }: SharedListsViewProps) {
  const sharedLists = useQuery(api.lists.getSharedLists);

  if (sharedLists === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Shared Lists</h2>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading shared lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Shared Lists</h2>
      {sharedLists.length === 0 ? (
        <p className="text-gray-500">
          No shared lists yet. When someone shares a list with you or you access a public list, it will appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {sharedLists.map((list) => (
            <div
              key={list._id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelectList(list._id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-primary hover:underline">
                    {list.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Access Level: <span className="font-medium">{list.accessLevel}</span>
                  </p>
                  <div className="text-xs text-gray-400 mt-1">
                    Permissions: 
                    {list.permissions?.canView && " View"}
                    {list.permissions?.canAdd && " • Add"}
                    {list.permissions?.canRemove && " • Edit/Remove"}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(list._creationTime).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
