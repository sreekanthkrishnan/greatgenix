import { PlanManager } from "../features/billing/PlanManager";
import { CouponManager } from "../features/billing/CouponManager";
import { SubscriptionPage } from "../features/billing/SubscriptionPage";
import { Profile } from "../features/profile/components/Profile";
import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
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
  const location = useLocation();
  const path = location.pathname.replace(/^\//, "");
  return path || "dashboard";
}

function CourseDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <CourseDetail id={id || ""} />;
}

function SessionsRoute() {
  const { id } = useParams<{ id?: string }>();
  return <Sessions id={id} />;
}

function RecordingsRoute() {
  const { id } = useParams<{ id?: string }>();
  return <Recordings id={id} />;
}

export function Router({ platform }: { route?: string; platform: boolean }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes>
      {/* Personal profiles are available to every signed-in role. */}
      <Route path="/profile" element={<Profile />} />
      <Route path="/plans" element={<PlanManager />} />
      <Route path="/coupons" element={<CouponManager />} />
      {platform ? (
        <>
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/" element={<Navigate to="/organizations" replace />} />
          <Route path="*" element={<Organizations />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetailRoute />} />
          <Route path="/sessions" element={<SessionsRoute />} />
          <Route path="/sessions/:id" element={<SessionsRoute />} />
          <Route path="/recordings" element={<RecordingsRoute />} />
          <Route path="/recordings/:id" element={<RecordingsRoute />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route
            path="*"
            element={
              <Unavailable
                title="Let’s find your way back"
                text="This page could not be found."
              />
            }
          />
        </>
      )}
    </Routes>
  );
}
