import { useEffect, useState } from "react";
import {
  Dashboard,
  Courses,
  CourseDetail,
} from "../features/courses/components/Screens";
import { Sessions } from "../features/live-classes/components/Screens";
import { Recordings } from "../features/recorded-classes/components/Screens";
import { Assessments } from "../features/assignments/components/Screens";
import { Attendance } from "../features/attendance/components/Screens";
import { Settings } from "../features/organizations/components/Settings";
import { Organizations } from "../features/organizations/components/Screens";
import { Unavailable } from "../shared/components";
export function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(2) || "dashboard");
  useEffect(() => {
    const update = () => {
      setRoute(location.hash.slice(2) || "dashboard");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
export function Router({
  route,
  platform,
}: {
  route: string;
  platform: boolean;
}) {
  const [page, id] = route.split("/");
  if (platform) return <Organizations />;
  switch (page) {
    case "dashboard":
      return <Dashboard />;
    case "courses":
      return id ? <CourseDetail id={id} /> : <Courses />;
    case "sessions":
      return <Sessions id={id} />;
    case "recordings":
      return <Recordings id={id} />;
    case "assessments":
      return <Assessments />;
    case "attendance":
      return <Attendance />;
    case "settings":
      return <Settings />;
    default:
      return (
        <Unavailable
          title="Let’s find your way back"
          text="This page could not be found."
        />
      );
  }
}
