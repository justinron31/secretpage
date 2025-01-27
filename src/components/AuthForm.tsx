import { useState } from "react";
import { supabase } from "../lib/supabase";
import styles from "../app/page.module.css";

export const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Show success message after successful signup
        setSuccessMessage("Confirmation link sent to your email!");
        // Clear the form
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formWrapper}>
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>

        {error && <p className={styles.error}>{error}</p>}
        {successMessage && (
          <p className={`${styles.success}`}>{successMessage}</p>
        )}

        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          {!isLogin && (
            <>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
              />
            </>
          )}
        </div>

        <div className={styles.submitButton}>
          <button type="submit" disabled={isSubmitting}>
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </div>

        <div className={styles.pcontainer}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccessMessage("");
            }}
            className={styles.switchButton}
          >
            {isLogin ? "Need an account? Sign up" : "Have an account? Login"}
          </button>
        </div>
      </form>
    </div>
  );
};
