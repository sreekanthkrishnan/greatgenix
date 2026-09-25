import { Field, Notice } from "../../../shared/components";
import type { Course } from "../../../shared/types";
import { money } from "../../../shared/utils/money";
import type { AccessKind } from "./AccessOptions";

export function parseCoursePricing(
  kind: AccessKind,
  price: string,
  discount: string,
) {
  if (kind !== "paid") return { coursePrice: null, discountedPrice: null };
  const coursePrice = Number(price);
  const discountedPrice = discount.trim() === "" ? null : Number(discount);
  if (!Number.isFinite(coursePrice) || coursePrice <= 0)
    throw new Error("Course Price must be greater than 0.");
  if (discountedPrice !== null) {
    if (!Number.isFinite(discountedPrice) || discountedPrice <= 0)
      throw new Error("Discounted Price must be greater than 0.");
    if (discountedPrice >= coursePrice)
      throw new Error("Discounted Price must be less than Course Price.");
  }
  return { coursePrice, discountedPrice };
}

export function CoursePricingFields({
  coursePrice,
  discountedPrice,
  onPriceChange,
  onDiscountChange,
}: {
  coursePrice: string;
  discountedPrice: string;
  onPriceChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
}) {
  return (
    <div className="form-row course-pricing-fields">
      <Field label="Course Price *" hint="INR (₹)">
        <input
          aria-label="Course Price"
          name="coursePrice"
          type="number"
          required
          min="0.01"
          step="0.01"
          placeholder="Enter course price"
          value={coursePrice}
          onChange={(e) => onPriceChange(e.target.value)}
        />
      </Field>
      <Field
        label="Discounted Price"
        hint="Leave empty if no discount applies."
      >
        <input
          aria-label="Discounted Price"
          name="discountedPrice"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Enter discounted price"
          value={discountedPrice}
          onChange={(e) => onDiscountChange(e.target.value)}
        />
      </Field>
    </div>
  );
}

export function CoursePricing({ course }: { course: Course }) {
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
    <>
      <h4>Course Price</h4>
      <p className="course-price-values">
        {validPrice ? (
          <>
            {hasDiscount && <del>{money(coursePrice * 100, "INR")}</del>}
            <strong>
              {money(
                (hasDiscount ? discountedPrice : coursePrice) * 100,
                "INR",
              )}
            </strong>
          </>
        ) : (
          "Contact your teacher for the course price."
        )}
      </p>
      <Notice>
        <strong>Payment Information</strong>
        <br />
        Please contact your teacher to complete the payment and receive your
        access coupon.
      </Notice>
    </>
  );
}
