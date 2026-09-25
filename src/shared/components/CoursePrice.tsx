import type { Course } from "../types";
import { money } from "../utils/money";

export function CoursePrice({ course }: { course: Course }) {
  const { coursePrice, discountedPrice } = course;
  const validPrice =
    coursePrice != null && Number.isFinite(coursePrice) && coursePrice > 0;
  const hasDiscount =
    validPrice &&
    discountedPrice != null &&
    Number.isFinite(discountedPrice) &&
    discountedPrice > 0 &&
    discountedPrice < coursePrice;
  return (
    <p className="course-price-values" aria-label="Course price">
      {course.pricing !== "paid" ? (
        <strong>Free</strong>
      ) : validPrice ? (
        <>
          {hasDiscount && <del>{money(coursePrice * 100, "INR")}</del>}
          <strong>
            {money((hasDiscount ? discountedPrice : coursePrice) * 100, "INR")}
          </strong>
        </>
      ) : (
        "Contact your teacher for the course price."
      )}
    </p>
  );
}
