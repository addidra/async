// app/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import ClientHome from "./ClientHome";
import axios from "axios";
import Test from "./Test";
export default async function HomePage() {
  const user = await currentUser();
  const username = user?.username || "User";
  console.log(username, user?.id)
  console.log(user)
  // Example of fetching data from an API route
  // const fetchFields = async () => {
  //   try {
  //     const response = await axios.get("/api/schema");
  //     return response.data;
  //   } catch (error) {
  //     console.error("Error fetching fields:", error);
  //   }
  // };

  // You can fetch static data here if needed
  // return <Test></Test>;
  return <ClientHome username={username} />;
}
