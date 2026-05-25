
import express from 'express'
import { propertySchema, updatePropertySchema } from '../utils/validate-schema'
import { validateRequest } from '../middleware/validate-request'

import { createProperty, deleteProperty, getAllProperties, getFeaturedProperties, getPropertyById, getRecommendedProperties, updateProperty } from '../controllers/property-controller'
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
router.patch("/:id",
    authenticateJWT,
    authorizeRoles("seller", "admin"),
    upload.array("images", 15),
    validateRequest({
        body: updatePropertySchema
    }),
    updateProperty
)
router.delete("/:id",
    authenticateJWT,
    authorizeRoles("seller", "admin"),
    deleteProperty
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
