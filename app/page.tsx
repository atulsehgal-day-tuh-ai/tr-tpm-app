import { redirect } from "next/navigation";

export default function Home() {
  // Canonical entry point: go to the main grid experience.
  redirect("/grid");
}