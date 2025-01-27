import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import styles from "../app/page.module.css";
import "../app/globals.css";

export default function SecretPage2() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  // Memoized function to fetch the current secret message
  const fetchCurrentMessage = useCallback(async () => {
    if (!user?.id) return;

    // Fetch the latest message by ordering and limiting to one
    const { data, error } = await supabase
      .from("secret_messages")
      .select("message")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }) // Ensure it gets the latest message
      .limit(1); // Limit to only one result

    if (error) {
      console.error("Error fetching secret message:", error);
      setCurrentMessage(null); // Set to null if there's an error
    } else if (data?.length > 0) {
      setCurrentMessage(data[0].message || null); // Set the most recent message
    } else {
      setCurrentMessage(null); // No message found for the user
    }
  }, [user?.id]);

  // Real-time subscription for updates
  useEffect(() => {
    if (user?.id) {
      fetchCurrentMessage();

      // Subscribe to changes in the secret message for this user
      const channel = supabase
        .channel("custom-channel")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "secret_messages",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Update the secret message on this page in real-time
            setCurrentMessage(payload.new.message);
          }
        )
        .subscribe();

      return () => {
        // Cleanup the subscription when the component unmounts
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, fetchCurrentMessage]);

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setStatus("You must be logged in");
      return;
    }

    if (!message.trim()) {
      setStatus("Message cannot be empty");
      return;
    }

    const { error } = await supabase.from("secret_messages").upsert({
      user_id: user.id,
      message: message.trim(),
    });

    if (error) {
      setStatus("Error saving message");
    } else {
      setStatus("Message saved successfully!");
      setCurrentMessage(message.trim()); // Update currentMessage immediately with the new message
      setMessage(""); // Clear the input field
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
        <h1>Secret Page 2</h1>
        <div className={styles.header}>
          <p>Hello, {user.email}</p>
        </div>
        <nav className={styles.nav}>
          <div className={styles.buttonNav}>
            <button onClick={() => router.push("/secret-page-1")}>
              Secret Page 1
            </button>
            <button onClick={() => router.push("/secret-page-3")}>
              Secret Page 3
            </button>
          </div>
        </nav>
        <div className={styles.messageContainer}>
          <h2>
            {currentMessage
              ? "Edit your secret message:"
              : "Enter a new secret message:"}
          </h2>

          <form onSubmit={handleSubmitMessage} className={styles.messageForm}>
            <div className={styles.currentMessage}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  currentMessage
                    ? "Edit your secret message..."
                    : "Enter your secret message..."
                }
                rows={6}
                cols={50}
                className={styles.messageInput}
              />
            </div>
            <button type="submit">
              {currentMessage ? "Update Message" : "Save Message"}
            </button>
          </form>

          {status && <p className={styles.error}>{status}</p>}
        </div>
      </div>
    </div>
  );
}
