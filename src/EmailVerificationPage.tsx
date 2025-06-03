import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export function EmailVerificationPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; email?: string } | null>(null);
  const verifyEmail = useMutation(api.emailVerification.verifyEmail);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);

    if (tokenParam) {
      handleVerifyEmail(tokenParam);
    }
  }, []);

  const handleVerifyEmail = async (verificationToken: string) => {
    setIsVerifying(true);
    try {
      const result = await verifyEmail({ token: verificationToken });
      setVerificationResult(result);
      toast.success("Email verified successfully! You can now access all features.");
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      toast.error("Verification failed: " + (error as Error).message);
      setVerificationResult({ success: false });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Verification Link</h1>
          <p className="text-gray-600 mb-6">
            The verification link is invalid or missing. Please check your email for the correct link.
          </p>
          <a
            href="/"
            className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        {isVerifying ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verifying Email...</h1>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </>
        ) : verificationResult?.success ? (
          <>
            <div className="text-green-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h1>
            <p className="text-gray-600 mb-6">
              Your email address has been successfully verified. You will be redirected to the home page shortly.
            </p>
            <a
              href="/"
              className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover transition-colors"
            >
              Continue to App
            </a>
          </>
        ) : (
          <>
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h1>
            <p className="text-gray-600 mb-6">
              The verification link is invalid or has expired. Please try signing up again or contact support.
            </p>
            <a
              href="/"
              className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover transition-colors"
            >
              Go to Home
            </a>
          </>
        )}
      </div>
    </div>
  );
}
