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

  const handleDelete = async (listId: Id<"lists">, listName: string) => {
    if (window.confirm(`Are you sure you want to delete the list "${listName}" and all its items?`)) {
      try {
        await deleteList({ listId });
        toast.success(`List "${listName}" deleted.`);
      } catch (error) {
        toast.error("Failed to delete list. " + (error as Error).message);
        console.error(error);
      }
    }
  };

  if (myLists === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading your lists...</p>
      </div>
    );
  }

  if (myLists.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-600">You haven't created any lists yet.</p>
        <p className="text-sm text-gray-500 mt-1">Use the form above to create your first one!</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Your Lists</h2>
      <ul className="space-y-3">
        {myLists.map((list) => (
          <li
            key={list._id}
            className="flex justify-between items-center p-4 border border-gray-200 rounded-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <span onClick={() => onSelectList(list._id)} className="text-lg text-primary hover:underline flex-grow">
              {list.name}
            </span>
            <button
              onClick={() => handleDelete(list._id, list.name)}
              className="ml-4 px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
              title="Delete list"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
