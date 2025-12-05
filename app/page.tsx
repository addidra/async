// app/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import ClientHome from "./ClientHome";

export default async function HomePage() {
  const user = await currentUser();
  const username = user?.username || "User";
  // const res = await fetch("https://jsonplaceholder.typicode.com/posts");
  // const posts = await res.json();
  // console.log(posts)
  console.log(username, user?.id)
  console.log(user)

  // You can fetch static data here if needed

  return <ClientHome username={username} />;
}
