import { useState } from "react";
import { SignInForm } from "./SignInForm";
import { CustomSignUpForm } from "./CustomSignUpForm";

export function AuthTabs() {
  const [activeTab, setActiveTab] = useState<"signIn" | "signUp">("signIn");

  return (
    <div className="w-full">
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "signIn"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("signIn")}
        >
          Sign In
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "signUp"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("signUp")}
        >
          Sign Up
        </button>
      </div>
      
      {activeTab === "signIn" ? <SignInForm /> : <CustomSignUpForm />}
    </div>
  );
}
