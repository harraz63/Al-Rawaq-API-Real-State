
import express from 'express'
import { propertySchema } from '../utils/validate-schema'
import { validateRequest } from 'zod-express-middleware'

import { createProperty, getAllProperties, getFeaturedProperties, getPropertyById, getRecommendedProperties } from '../controllers/property-controller'
import { authenticateJWT, authorizeRoles } from '../middleware/auth-middleware'
import { upload } from '../middleware/upload'

const router = express()


router.post("/create",
    authenticateJWT,
    authorizeRoles("seller", "admin"),
    upload.array("images", 15),
    validateRequest({
        body: propertySchema
    }),
    createProperty
)
router.get("/featured",
    getFeaturedProperties
)
router.get("/",
    getAllProperties
)
router.get("/:id",
    getPropertyById
)
router.get("/:propertyId/recommended"
    , getRecommendedProperties);

export default router