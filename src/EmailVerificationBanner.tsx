import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

interface EmailVerificationBannerProps {
  email: string;
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const createVerificationToken = useMutation(api.emailVerification.createVerificationToken);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await createVerificationToken({ email });
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      toast.error("Failed to send verification email: " + (error as Error).message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Email Verification Required
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Please check your email ({email}) and click the verification link to access all features.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
