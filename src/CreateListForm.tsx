import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function CreateListForm() {
  const [listName, setListName] = useState("");
  const createList = useMutation(api.lists.createList);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) {
      toast.error("List name cannot be empty.");
      return;
    }
    try {
      await createList({ name: listName });
      toast.success(`List "${listName}" created!`);
      setListName("");
    } catch (error) {
      toast.error("Failed to create list. " + (error as Error).message);
      console.error(error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Create New List</h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          placeholder="Enter list name (e.g., 'My Favorite Tutorials')"
          className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary transition-shadow shadow-sm hover:shadow"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors shadow-sm hover:shadow disabled:opacity-50"
          disabled={!listName.trim()}
        >
          Create List
        </button>
      </form>
    </div>
  );
}
