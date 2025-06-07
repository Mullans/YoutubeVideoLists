import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface ListSettingsModalProps {
  list: Doc<"lists">;
  isOpen: boolean;
  onClose: () => void;
}

export function ListSettingsModal({ list, isOpen, onClose }: ListSettingsModalProps) {
  const defaultPermissions = {
    public: { canView: false, canAdd: false, canRemove: false },
    users: { canView: false, canAdd: false, canRemove: false },
    invited: { canView: true, canAdd: true, canRemove: false },
  };
  const [permissions, setPermissions] = useState(list.permissions || defaultPermissions);
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTab, setActiveTab] = useState<"permissions" | "sharing" | "invitations">("permissions");
  
  const updatePermissions = useMutation(api.lists.updateListPermissions);
  const inviteUser = useMutation(api.lists.inviteUserToList);
  const removeInvitation = useMutation(api.lists.removeInvitation);
  const resendInvitation = useMutation(api.lists.resendInvitation);

  const invitations = useQuery(api.lists.getListInvitations, { listId: list._id });
  
  const handleSavePermissions = async () => {
    try {
      await updatePermissions({
        listId: list._id,
        permissions,
      });
      toast.success("Permissions updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update permissions: " + (error as Error).message);
    }
  };
  
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address.");
      return;
    }
    
    try {
      await inviteUser({
        listId: list._id,
        email: inviteEmail.trim(),
      });
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
    } catch (error) {
      toast.error("Failed to send invitation: " + (error as Error).message);
    }
  };

  const handleRemoveInvitation = async (invitationId: Id<"listInvitations">) => {
    try {
      await removeInvitation({ invitationId });
      toast.success("Invitation removed successfully!");
    } catch (error) {
      toast.error("Failed to remove invitation: " + (error as Error).message);
    }
  };

  const handleResendInvitation = async (invitationId: Id<"listInvitations">) => {
    try {
      await resendInvitation({ invitationId });
      toast.success("Invitation resent successfully!");
    } catch (error) {
      toast.error("Failed to resend invitation: " + (error as Error).message);
    }
  };


  
  const getShareUrl = () => {
    // Use the current window location for the share URL
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${list.shareToken}`;
  };
  
  const copyShareUrl = () => {
    // Check if the list has appropriate permissions for sharing
    const hasViewAccess = permissions.public.canView || permissions.users.canView || permissions.invited.canView;
    
    if (!hasViewAccess) {
      toast.error("Please configure view permissions before sharing. At least one group (Public, Users, or Invited) must be able to view the list.");
      return;
    }

    navigator.clipboard.writeText(getShareUrl());
    toast.success("Share link copied to clipboard!");
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">List Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex border-b">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === "permissions"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("permissions")}
            >
              Permissions
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === "sharing"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("sharing")}
            >
              Sharing
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === "invitations"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("invitations")}
            >
              Invitations
            </button>
          </div>
        </div>
        
        {activeTab === "permissions" && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600 mb-4">
              Configure who can view, add videos to, and remove videos from this list.
            </div>
            
            {/* Public Permissions */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Public (Anyone with link)</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.public.canView}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        public: { ...permissions.public, canView: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can view the list
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.public.canAdd}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        public: { ...permissions.public, canAdd: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can add videos to the list
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.public.canRemove}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        public: { ...permissions.public, canRemove: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can edit/remove videos from the list
                </label>
              </div>
            </div>
            
            {/* Users Permissions */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Users (Logged in users)</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.users.canView}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        users: { ...permissions.users, canView: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can view the list
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.users.canAdd}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        users: { ...permissions.users, canAdd: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can add videos to the list
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.users.canRemove}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        users: { ...permissions.users, canRemove: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can edit/remove videos from the list
                </label>
              </div>
            </div>
            
            {/* Invited Permissions */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Invited Users</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.invited.canView}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        invited: { ...permissions.invited, canView: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can view the list
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.invited.canAdd}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        invited: { ...permissions.invited, canAdd: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can add videos to the list
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.invited.canRemove}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        invited: { ...permissions.invited, canRemove: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Can edit/remove videos from the list
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
              >
                Save Permissions
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {activeTab === "sharing" && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600 mb-4">
              Share this list with others or invite specific users.
            </div>
            
            {/* Share Link */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Share Link</h3>
              <p className="text-sm text-gray-600 mb-3">
                Anyone with this link can access the list based on your permission settings.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getShareUrl()}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <button
                  onClick={copyShareUrl}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
                >
                  Copy
                </button>
              </div>
            </div>
            
            {/* Invite Users */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Invite Users</h3>
              <p className="text-sm text-gray-600 mb-3">
                Invite specific users by email address. They will have the permissions set for "Invited Users".
              </p>
              <form onSubmit={handleInviteUser} className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Invite
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "invitations" && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600 mb-4">
              Manage users who have been invited to this list.
            </div>
            
            {invitations === undefined ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading invitations...</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users have been invited to this list yet.
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div key={invitation._id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{invitation.invitedEmail}</div>
                      <div className="text-sm text-gray-500">
                        Status: {invitation.hasAccessed ? (
                          <span className="text-green-600 font-medium">Has accessed the list</span>
                        ) : invitation.invitedUserExists ? (
                          <span className="text-yellow-600 font-medium">User exists but hasn't accessed</span>
                        ) : (
                          <span className="text-gray-600">Invitation pending</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Invited on {new Date(invitation._creationTime).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!invitation.hasAccessed && (
                        <button
                          onClick={() => handleResendInvitation(invitation._id)}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Resend
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveInvitation(invitation._id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
