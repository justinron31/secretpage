import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import styles from "../app/page.module.css";
import "../app/globals.css";

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  sender_email: string;
}

interface DatabaseUser {
  id: string;
  email: string;
}

export default function SecretPage3() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<DatabaseUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friendMessages, setFriendMessages] = useState<{
    [key: string]: string;
  }>({});
  const [searchEmail, setSearchEmail] = useState("");
  const [searchStatus, setSearchStatus] = useState<{
    message: string;
    type: "error" | "success" | "none";
  }>({ message: "", type: "none" });

  // Function to search for users by email and send friend requests
  const searchAndAddFriend = async (email: string) => {
    if (!user?.id || !email) return;

    try {
      // Search for the user by email
      const { data: foundUsers, error: searchError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email.trim())
        .neq("id", user.id)
        .single();

      if (searchError || !foundUsers) {
        setSearchStatus({
          message: "User not found",
          type: "error",
        });
        return;
      }

      // Check if a friend request already exists between the two users
      const { data: existingRequest, error: requestCheckError } = await supabase
        .from("friend_requests")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${foundUsers.id}),and(sender_id.eq.${foundUsers.id},receiver_id.eq.${user.id})`
        )
        .single();

      if (requestCheckError) {
        // Send a new friend request if no existing request is found
        const { error: sendError } = await supabase
          .from("friend_requests")
          .insert({
            sender_id: user.id,
            receiver_id: foundUsers.id,
            status: "pending",
            sender_email: user.email, // Insert sender email here
          });

        if (sendError) throw sendError;

        setSearchStatus({
          message: "Friend request sent successfully!",
          type: "success",
        });
        setSearchEmail("");
        fetchPendingRequests();
      } else {
        // Handle different statuses for existing requests
        if (existingRequest.status === "pending") {
          setSearchStatus({
            message: "A friend request is already pending with this user",
            type: "error",
          });
        } else if (existingRequest.status === "accepted") {
          setSearchStatus({
            message: "You are already friends with this user",
            type: "error",
          });
        }
      }
    } catch (error) {
      console.error("Error in friend request process:", error);
      setSearchStatus({
        message: "An error occurred while processing your request",
        type: "error",
      });
    }
  };

  // Function to unfriend a user
  const unfriendUser = async (friendId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        );

      if (error) throw error;

      // Update the friends list after unfriending
      setFriends(friends.filter((friend) => friend.id !== friendId));
      setSearchStatus({
        message: "Friend removed successfully",
        type: "success",
      });
    } catch (error) {
      console.error("Error unfriending user:", error);
      setSearchStatus({
        message: "Error removing friend",
        type: "error",
      });
    }
  };

  // Function to fetch friends list
  const fetchFriends = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: friendRequests, error: friendRequestsError } =
        await supabase
          .from("friend_requests")
          .select("sender_id, receiver_id")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq("status", "accepted");

      if (friendRequestsError) throw friendRequestsError;

      if (friendRequests) {
        const friendIds = friendRequests.map((fr) =>
          fr.sender_id === user.id ? fr.receiver_id : fr.sender_id
        );

        if (friendIds.length > 0) {
          const { data: friendsData, error: friendsError } = await supabase
            .from("profiles")
            .select("id, email")
            .in("id", friendIds);

          if (friendsError) throw friendsError;

          if (friendsData) {
            const typedFriendsData = friendsData as DatabaseUser[];
            setFriends(typedFriendsData);
            await fetchFriendMessages(typedFriendsData);
          }
        } else {
          setFriends([]);
        }
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  }, [user?.id]);

  // Function to fetch pending friend requests
  const fetchPendingRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      if (data) {
        setPendingRequests(data as FriendRequest[]);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  }, [user?.id]);

  // Function to fetch secret messages from friends
  const fetchFriendMessages = async (friends: DatabaseUser[]) => {
    try {
      const messages: { [key: string]: string } = {};

      for (const friend of friends) {
        const { data, error } = await supabase
          .from("secret_messages")
          .select("message")
          .eq("user_id", friend.id)
          .single();

        if (error) throw error;

        if (data) {
          messages[friend.id] = data.message;
        }
      }

      setFriendMessages(messages);
    } catch (error) {
      console.error("Error fetching friend messages:", error);
    }
  };

  // Function to handle friend requests (accept/reject)
  // Function to handle friend requests (accept/reject)
  const handleRequest = async (
    requestId: string,
    status: "accepted" | "rejected"
  ) => {
    try {
      // Check if user is defined before proceeding
      if (!user) {
        setSearchStatus({
          message: "User not authenticated.",
          type: "error",
        });
        return;
      }

      // Get the friend request data
      const { data: requestData, error: requestError } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (requestError || !requestData) throw new Error("Request not found");

      // If the status is "rejected", delete the existing request
      if (status === "rejected") {
        const { error: deleteError } = await supabase
          .from("friend_requests")
          .delete()
          .eq("id", requestId);

        if (deleteError) throw deleteError;

        setSearchStatus({
          message: "Friend request rejected.",
          type: "success",
        });

        // Fetch the updated friend request list after rejection
        await fetchPendingRequests();
      }

      // If the status is "accepted", update the request status
      if (status === "accepted") {
        const { error: updateError } = await supabase
          .from("friend_requests")
          .update({ status })
          .eq("id", requestId);

        if (updateError) throw updateError;

        // Update the friends and pending requests after accepting the request
        await fetchPendingRequests();
        await fetchFriends();
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      setSearchStatus({
        message: "Error handling friend request.",
        type: "error",
      });
    }
  };

  // Effect hook to fetch friends and pending requests on load
  useEffect(() => {
    if (user?.id) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [user, fetchFriends, fetchPendingRequests]);

  // Loading and authentication checks
  if (loading) return <div>Loading...</div>;
  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>Secret Page 3</h1>
        <div className={styles.header}>
          <p>Hello, {user.email}</p>
        </div>
        <nav className={styles.nav}>
          <div className={styles.buttonNav}>
            <button onClick={() => router.push("/secret-page-1")}>
              Secret Page 1
            </button>
            <button onClick={() => router.push("/secret-page-2")}>
              Secret Page 2
            </button>
          </div>
        </nav>

        <div className={styles.messageContainer}>
          <h2>Add Friend by Email</h2>
          <div className={styles.searchContainer}>
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Enter friend's email"
              className={styles.searchInput}
            />
            <button
              onClick={() => searchAndAddFriend(searchEmail)}
              className={styles.searchButton}
            >
              Add Friend
            </button>
            {searchStatus.type !== "none" && (
              <p
                className={`${styles.statusMessage} ${
                  styles[searchStatus.type]
                }`}
              >
                {searchStatus.message}
              </p>
            )}
          </div>

          <div className={styles.friendContainer}>
            <h2>Friend Requests</h2>
            <ul className={styles.requestsList}>
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <li key={request.id}>
                    <p>
                      Request from{" "}
                      {request.sender_id === user.id
                        ? "you"
                        : request.sender_email}
                    </p>
                    <button
                      onClick={() => handleRequest(request.id, "accepted")}
                      className={styles.acceptButton}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, "rejected")}
                      className={styles.rejectButton}
                    >
                      Reject
                    </button>
                  </li>
                ))
              ) : (
                <p>No pending requests</p>
              )}
            </ul>
          </div>

          <div className={styles.friendContainer}>
            <h2>Your Friends</h2>
            <ul className={styles.friendsList}>
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <li key={friend.id}>
                    <p>{friend.email}</p>
                    {friendMessages[friend.id] && (
                      <p>{friendMessages[friend.id]}</p>
                    )}
                    <button
                      onClick={() => unfriendUser(friend.id)}
                      className={styles.unfriendButton}
                    >
                      Unfriend
                    </button>
                  </li>
                ))
              ) : (
                <p>No friends yet</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
