import { Redirect } from 'expo-router';

/** Der Wochenplaner heißt jetzt „Todos“. Alte Lesezeichen auf /woche landen dort. */
export default function OldWeekRoute() {
  return <Redirect href="/todos" />;
}
