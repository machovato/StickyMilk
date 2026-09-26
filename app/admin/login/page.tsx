import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/admin" } = await props.searchParams;

  return <AdminLoginForm next={next} />;
}
