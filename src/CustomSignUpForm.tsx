"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function CustomSignUpForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const createVerificationToken = useMutation(api.emailVerification.createVerificationToken);
  const checkUsernameAvailable = useQuery(api.users.checkUsernameAvailable, 
    username.length >= 3 ? { username } : "skip"
  );
  const createUsernameForCurrentUser = useMutation(api.users.createUsernameForCurrentUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !username) {
      toast.error("All fields are required");
      return;
    }

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters long");
      return;
    }

    if (checkUsernameAvailable === false) {
      toast.error("Username is already taken");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signUp");

      await signIn("password", formData);
      
      // After successful sign up, we need to wait a moment for the user to be created
      // then create the username for the current user
      setTimeout(async () => {
        try {
          await createUsernameForCurrentUser({ username });
          await createVerificationToken({ email });
          toast.success("Account created! Please check your email to verify your account.");
        } catch (error) {
          console.error("Error creating username:", error);
          toast.error("Account created but failed to set username. Please contact support.");
        }
      }, 1000);
    } catch (error: any) {
      console.error("Sign up error:", error);
      if (error.message.includes("Invalid password")) {
        toast.error("Invalid password. Please try again.");
      } else if (error.message.includes("already exists")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error("Could not create account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-form-field">
        <input
          className="auth-input-field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <div>
          <input
            className="auth-input-field"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="Username"
            required
            minLength={3}
          />
          {username.length >= 3 && checkUsernameAvailable === false && (
            <p className="text-red-500 text-sm mt-1">Username is already taken</p>
          )}
          {username.length >= 3 && checkUsernameAvailable === true && (
            <p className="text-green-500 text-sm mt-1">Username is available</p>
          )}
        </div>
        <input
          className="auth-input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button 
          className="auth-button" 
          type="submit" 
          disabled={submitting || !email || !password || !username || checkUsernameAvailable === false}
        >
          {submitting ? "Creating Account..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
