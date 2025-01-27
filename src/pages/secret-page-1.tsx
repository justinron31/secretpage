import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import styles from "../app/page.module.css";
import "../app/globals.css";

export default function SecretPage1() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [secretMessage, setSecretMessage] = useState<string | null>(null);

  const fetchSecretMessage = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("secret_messages")
      .select("message")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching secret message:", error);
      setSecretMessage(null);
    } else if (data) {
      setSecretMessage(data.message);
    } else {
      setSecretMessage(null);
    }
  }, [user?.id]);

  // Real-time subscription for updates in the 'secret_messages' table
  useEffect(() => {
    if (user?.id) {
      fetchSecretMessage();

      // Subscribe to changes in the 'secret_messages' table for the user
      const channel = supabase
        .channel("custom-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "secret_messages",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Update the secret message when a new row is inserted (i.e., a new message)
            setSecretMessage(payload.new.message);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, fetchSecretMessage]);

  // Sign out function
  const handleSignOut = async () => {
    const confirmSignOut = window.confirm("Are you sure you want to sign out?");
    if (confirmSignOut) {
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  // Delete account function
  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    if (
      confirm(
        "Are you sure you want to delete your account? This cannot be undone."
      )
    ) {
      try {
        const { error } = await supabase.rpc("delete_user");

        if (error) {
          console.error("Error deleting account:", error);
          alert("Failed to delete account: " + error.message);
          return;
        }

        await supabase.auth.signOut();
        router.push("/");
      } catch (e) {
        console.error("Error deleting account:", e);
        alert("An unexpected error occurred while deleting your account.");
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>Secret Page 1</h1>
        <div className={styles.header}>
          <p>Hello, {user.email}</p>
          <div className={styles.accountButtons}>
            <button onClick={handleSignOut}>Sign Out</button>
            <button
              onClick={handleDeleteAccount}
              className={styles.deleteButton}
            >
              Delete Account
            </button>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.buttonNav}>
            <button onClick={() => router.push("/secret-page-2")}>
              Secret Page 2
            </button>
            <button onClick={() => router.push("/secret-page-3")}>
              Secret Page 3
            </button>
          </div>
        </nav>

        <div className={styles.messageContainer}>
          <h2>Your Secret Message:</h2>
          {secretMessage ? (
            <p>{secretMessage}</p>
          ) : (
            <p>No secret message yet! Go to Secret Page 2 to create one.</p>
          )}
        </div>
      </div>
    </div>
  );
}
