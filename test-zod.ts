import { z } from "zod";

const mySchema = z.enum(["male", "female"], { message: "Custom enum error" });
console.log(mySchema.safeParse("other").success ? "Success" : "Failed");

