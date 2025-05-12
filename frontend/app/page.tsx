import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login page
  redirect('/login');
  
  // This part won't be executed due to the redirect, but is required for TypeScript
  return null;
}
