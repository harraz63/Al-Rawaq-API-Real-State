import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
});

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']),
});

const tokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

const featuredPropertiesSchema = z.object({
  propertyIds: z
    .array(z.string().min(1))
    .max(8, 'You can feature at most 8 properties'),
});

const workspaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().min(1, 'Color is required'),
});

const projectSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  status: z.enum([
    'Planning',
    'In Progress',
    'On Hold',
    'Completed',
    'Cancelled',
  ]),
  startDate: z.string(),
  dueDate: z.string().optional(),
  tags: z.string().optional(),
  members: z
    .array(
      z.object({
        user: z.string(),
        role: z.enum(['manager', 'contributor', 'viewer']),
      }),
    )
    .optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  priority: z.enum(['Low', 'Medium', 'High']),
  dueDate: z.string().min(1, 'Due date is required'),
  assignees: z.array(z.string()).min(1, 'At least one assignee is required'),
});

// export const propertySchema = z.object({
//     title: z
//         .string({ required_error: "العنوان مطلوب" })
//         .min(3, "العنوان يجب أن يحتوي على 3 أحرف على الأقل"),

//     description: z
//         .string({ required_error: "الوصف مطلوب" })
//         .min(10, "الوصف يجب أن يحتوي على 10 أحرف على الأقل"),

//     price: z
//         .number({ required_error: "السعر مطلوب" })
//         .positive("السعر يجب أن يكون رقمًا موجبًا"),

//     pricePerMeter: z.number().optional(),
//     area: z.number().positive("المساحة يجب أن تكون رقمًا موجبًا"),

//     location: z.object({
//         address: z.string({ required_error: "العنوان مطلوب" }),
//         city: z.string({ required_error: "المدينة مطلوبة" }),
//         country: z
//             .enum(["egypt", "usa", "saudia arabia", "palestine"])
//             .default("egypt"),
//         coordinates: z
//             .object({
//                 lat: z.number().optional(),
//                 lng: z.number().optional(),
//             })
//             .optional(),
//     }),

//     images: z
//         .array(
//             z.union([
//                 z.string().url(),
//                 z.object({ url: z.string().url() }),
//             ])
//         )
//         .min(1, "يجب رفع صورة واحدة على الأقل"),

//     purpose: z.enum(["sale", "rent"], {
//         required_error: "الغرض مطلوب (بيع / إيجار)",
//     }),

//     type: z.enum(["apartment", "villa", "house", "land", "office", "store"], {
//         required_error: "نوع العقار مطلوب",
//     }),

//     paymentMethod: z
//         .enum(["cash", "installments", "bank-financing"])
//         .default("cash"),

//     advertiserType: z
//         .enum(["owner", "broker", "developer"])
//         .default("owner"),

//     bedrooms: z.number().optional(),
//     bathrooms: z.number().optional(),
//     areaSize: z.number().optional(),
//     amenities: z.array(z.string()).optional(),

//     details: z
//         .object({
//             view: z.string().optional(),
//             pricePerMeter: z.number().optional(),
//             listingCode: z.string().optional(),
//         })
//         .optional(),

//     status: z.enum(["available", "sold", "rented", "pending"]).default("available"),
// });

export const propertySchema = z.object({
  title: z
    .string({ required_error: 'العنوان مطلوب' })
    .min(3, 'العنوان يجب أن يحتوي على 3 أحرف على الأقل'),

  description: z
    .string({ required_error: 'الوصف مطلوب' })
    .min(10, 'الوصف يجب أن يحتوي على 10 أحرف على الأقل'),

  price: z.preprocess(
    (val) => Number(val),
    z
      .number({ required_error: 'السعر مطلوب' })
      .positive('السعر يجب أن يكون رقمًا موجبًا'),
  ),

  pricePerMeter: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional(),
  ),

  area: z.preprocess(
    (val) => Number(val),
    z.number().positive('المساحة يجب أن تكون رقمًا موجبًا'),
  ),

  listedBy: z
    .string({
      required_error: 'الـ ID الخاص بصاحب العقار مطلوب',
      invalid_type_error: 'الـ ID الخاص بصاحب العقار يجب أن يكون نصًا',
    })
    .trim()
    .regex(/^[a-f\d]{24}$/i, 'الـ ID الخاص بصاحب العقار غير صالح'),

  location: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z.object({
      street: z.string({ required_error: 'العنوان مطلوب' }),
      city: z.string({ required_error: 'المدينة مطلوبة' }),
      governorate: z.enum(
        [
          'القاهرة',
          'الجيزة',
          'الإسكندرية',
          'القليوبية',
          'الدقهلية',
          'المنوفية',
          'البحيرة',
          'كفر الشيخ',
          'سوهاج',
          'أسيوط',
          'أسوان',
          'الأقصر',
          'دمياط',
          'الفيوم',
          'بورسعيد',
          'الإسماعيلية',
        ],
        { required_error: 'المحافظة مطلوبة' },
      ),
      coordinates: z
        .object({
          lat: z.preprocess(
            (v) => (v ? Number(v) : undefined),
            z.number().optional(),
          ),
          lng: z.preprocess(
            (v) => (v ? Number(v) : undefined),
            z.number().optional(),
          ),
        })
        .optional(),
    }),
  ),
  images: z
    .array(z.string().url())
    .min(1, 'يجب رفع صورة واحدة على الأقل')
    .optional(),

  purpose: z.enum(['sale', 'rent'], {
    required_error: 'الغرض مطلوب (بيع / إيجار)',
  }),

  type: z.enum(['apartment', 'villa', 'house', 'land', 'office', 'store'], {
    required_error: 'نوع العقار مطلوب',
  }),

  paymentMethod: z
    .enum(['cash', 'installments', 'bank-financing'])
    .default('cash'),

  advertiserType: z.enum(['owner', 'broker', 'developer']).default('owner'),

  bedrooms: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional(),
  ),
  bathrooms: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional(),
  ),
  areaSize: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional(),
  ),
  amenities: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z.array(z.string()).optional(),
  ),

  details: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z
      .object({
        view: z.string().optional(),
        pricePerMeter: z.number().optional(),
        listingCode: z.string().optional(),
      })
      .optional(),
  ),

  status: z
    .enum(['available', 'sold', 'rented', 'pending'])
    .default('available'),
});

export {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  emailSchema,
  workspaceSchema,
  projectSchema,
  taskSchema,
  inviteMemberSchema,
  tokenSchema,
  refreshTokenSchema,
  featuredPropertiesSchema,
};
