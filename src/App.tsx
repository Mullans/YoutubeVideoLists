import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { AuthTabs } from "./AuthTabs";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { CreateListForm } from "./CreateListForm";
import { MyListsView } from "./MyListsView";
import { SharedListsView } from "./SharedListsView";
import { useState, useEffect } from "react";
import { Id } from "../convex/_generated/dataModel";
import { ListView } from "./ListView";
import { SharedListView } from "./SharedListView";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { EmailVerificationPage } from "./EmailVerificationPage";

export default function App() {
  const handleHeaderClick = () => {
    // Clear any navigation state and go to home
    localStorage.removeItem('navigateToList');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4 sm:px-6 lg:px-8">
        <button 
          onClick={handleHeaderClick}
          className="text-xl font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
        >
          VideoList Curator
        </button>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster richColors />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.users.getCurrentUser);
  const [selectedListId, setSelectedListId] = useState<Id<"lists"> | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    // Check URL path for routing
    const path = window.location.pathname;
    
    // Check for shared list URL
    const sharedMatch = path.match(/^\/shared\/(.+)$/);
    if (sharedMatch) {
      setShareToken(sharedMatch[1]);
      return;
    }

    // Check for individual list URL
    const listMatch = path.match(/^\/lists\/(.+)$/);
    if (listMatch) {
      setSelectedListId(listMatch[1] as Id<"lists">);
      return;
    }

    // Check if we need to navigate to a specific list (from shared link redirect)
    const navigateToList = localStorage.getItem('navigateToList');
    if (navigateToList && loggedInUser) {
      localStorage.removeItem('navigateToList');
      // Navigate to the individual list page
      window.history.pushState({}, '', `/lists/${navigateToList}`);
      setSelectedListId(navigateToList as Id<"lists">);
    }
  }, [loggedInUser]);

  // Check if we're on the email verification page
  if (window.location.pathname === "/verify-email") {
    return <EmailVerificationPage />;
  }

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If we have a share token, show the shared list view
  if (shareToken) {
    return <SharedListView shareToken={shareToken} />;
  }

  // If we have a selected list ID, show the list view
  if (selectedListId) {
    return (
      <ListView
        listId={selectedListId}
        onBack={() => {
          // Navigate back to home and clear the URL
          window.history.pushState({}, '', '/');
          setSelectedListId(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
          Curate Your Video Lists
        </h1>
        <Authenticated>
          <p className="text-lg sm:text-xl text-secondary">
            Welcome back, {loggedInUser?.username ? `@${loggedInUser.username}` : loggedInUser?.name ?? loggedInUser?.email ?? "friend"}!
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-lg sm:text-xl text-secondary">
            Sign in to create and manage your video playlists.
          </p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <AuthTabs />
        </div>
      </Unauthenticated>

      <Authenticated>
        {loggedInUser && loggedInUser.email && !loggedInUser.emailVerified && (
          <EmailVerificationBanner email={loggedInUser.email} />
        )}
        <div className="space-y-6">
          {(!loggedInUser?.email || loggedInUser.emailVerified) && <CreateListForm />}
          <MyListsView onSelectList={(listId) => {
            // Navigate to individual list page
            window.history.pushState({}, '', `/lists/${listId}`);
            setSelectedListId(listId);
          }} />
          <SharedListsView onSelectList={(listId) => {
            // Navigate to individual list page
            window.history.pushState({}, '', `/lists/${listId}`);
            setSelectedListId(listId);
          }} />
        </div>
      </Authenticated>
    </div>
  );
}
