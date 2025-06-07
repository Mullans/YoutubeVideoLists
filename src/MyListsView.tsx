import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface MyListsViewProps {
  onSelectList: (listId: Id<"lists">) => void;
}

export function MyListsView({ onSelectList }: MyListsViewProps) {
  const myLists = useQuery(api.lists.getMyLists);
  const deleteList = useMutation(api.lists.deleteList);

  const handleDeleteList = async (listId: Id<"lists">, listName: string) => {
    if (confirm(`Are you sure you want to delete "${listName}"? This action cannot be undone.`)) {
      try {
        await deleteList({ listId });
        toast.success("List deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete list: " + (error as Error).message);
      }
    }
  };

  if (myLists === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">My Lists</h2>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">My Lists</h2>
      {myLists.length === 0 ? (
        <p className="text-gray-500">You haven't created any lists yet. Use the form above to create your first list!</p>
      ) : (
        <div className="space-y-3">
          {myLists.map((list) => (
            <div key={list._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <h3 
                  className="text-lg font-medium text-primary cursor-pointer hover:text-primary-hover"
                  onClick={() => onSelectList(list._id)}
                >
                  {list.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Created {new Date(list._creationTime).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSelectList(list._id)}
                  className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover"
                >
                  View
                </button>
                <button
                  onClick={() => handleDeleteList(list._id, list.name)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
