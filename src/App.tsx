import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
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
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-primary">VideoList Curator</h2>
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
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [selectedListId, setSelectedListId] = useState<Id<"lists"> | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're on a shared list URL or verification page
    const path = window.location.pathname;
    const sharedMatch = path.match(/^\/shared\/(.+)$/);
    if (sharedMatch) {
      setShareToken(sharedMatch[1]);
    }
  }, []);

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

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
          Curate Your Video Lists
        </h1>
        <Authenticated>
          <p className="text-lg sm:text-xl text-secondary">
            Welcome back, {loggedInUser?.name ?? loggedInUser?.email ?? "friend"}!
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
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        {loggedInUser && loggedInUser.email && !loggedInUser.emailVerified && (
          <EmailVerificationBanner email={loggedInUser.email} />
        )}
        {selectedListId ? (
          <ListView
            listId={selectedListId}
            onBack={() => setSelectedListId(null)}
          />
        ) : (
          <div className="space-y-6">
            {(!loggedInUser?.email || loggedInUser.emailVerified) && <CreateListForm />}
            <MyListsView onSelectList={setSelectedListId} />
            <SharedListsView onSelectList={setSelectedListId} />
          </div>
        )}
      </Authenticated>
    </div>
  );
}
