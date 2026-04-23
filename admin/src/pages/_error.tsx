import Error, { type ErrorProps } from "next/error";

export default function AdminErrorPage(props: ErrorProps) {
  return <Error statusCode={props.statusCode} title={props.title} />;
}
