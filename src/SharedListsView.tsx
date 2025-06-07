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
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Shared with Me</h2>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading shared lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Shared with Me</h2>
      {sharedLists.length === 0 ? (
        <p className="text-gray-500">No lists have been shared with you yet.</p>
      ) : (
        <div className="space-y-3">
          {sharedLists.map((list) => (
            <div key={list._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <h3 
                  className="text-lg font-medium text-primary cursor-pointer hover:text-primary-hover"
                  onClick={() => onSelectList(list._id)}
                >
                  {list.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Shared via {list.accessLevel} • Created {new Date(list._creationTime).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSelectList(list._id)}
                  className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
