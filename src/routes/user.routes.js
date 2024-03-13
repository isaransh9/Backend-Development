import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUsercoverImage } from "../controllers/user.controllers.js";
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route('/register').post(
  upload.fields([                   // Middleware
    {
      name: "avatar",
      maxCount: 1
    },
    {
      name: "coverImage",
      maxCount: 1
    }
  ]),
  registerUser);

router.route('/login').post(loginUser);

//Secured routes
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/current-user').post(verifyJWT, getCurrentUser);
router.route('/update-account-details').post(verifyJWT, updateAccountDetails);
router.route('/update-avatar').post(verifyJWT,upload.fields([{ name: "avatar", maxCount: 1}]), updateUserAvatar);
router.route('/update-coverImage').post(verifyJWT,upload.fields([{ name: "coverImage", maxCount: 1}]), updateUsercoverImage);

export default router;