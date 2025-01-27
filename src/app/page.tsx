// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import styles from "./page.module.css";
import { AuthForm } from "@/components/AuthForm";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/secret-page-1");
    }
  }, [user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>Welcome to Secret Pages</h1>
        {!user && <AuthForm />}
      </div>
    </div>
  );
}
