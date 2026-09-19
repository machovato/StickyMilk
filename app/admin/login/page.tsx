import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/" } = await props.searchParams;

  return <AdminLoginForm next={next} />;
}
