import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh tokens");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // Algorithm/Procedure that we will be performing to register users
  // get user detail from the frontend
  // validate the received user info -- not empty, constraints
  // check if user already registered -- through username or email
  // check for images received and avatar is must
  // upload them to cloudinary server
  // create user object -- entry in db
  // remove hashed password, refresh token from response object
  // check for user creation 
  // return res

  const { fullName, email, username, password } = req.body;  // getting user details
  console.log(req.body);

  // Validating
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
    // Iterates over the items and checks if empty or not
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Checking if user exists?
  const existeduser = await User.findOne({
    $or: [{ fullName }, { email }]
  })

  if (existeduser) {
    throw new ApiError(409, "User already exists");
  }

  // ? handles if it do not exist
  // Getting the path to the file on local server which is saved by multer
  const avatarLocalPath = req.files?.avatar[0]?.path;

  // const coverImageLocalPath = req.files?.coverImage[0]?.path; ==> Bug in this line with ?

  // This will work
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!!");
  }

  // Uploading files on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  // Creating instance of user and storing the details in the DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", // We don't know it exist or not. Make sure to check these small things 
    email,
    password,
    username: username.toLowerCase(),
  });

  // if user is created then select all by defailt and remove password and refreshToken 
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res.status(200).json(
    new ApiResponse(200, createdUser, "User created successfully")
  );
})

const loginUser = asyncHandler(async (req, res) => {
  // Algorithm
  // Extract the data received from the frontend --> req.body
  // Validate the data
  // find the user in the database
  // check if the entered password is matching against the one stored in the database
  // Generate access and refresh token
  // send secure cookies
  // Successfully logged in

  const { username, password, email } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findOne(user._id).select("-password -refreshToken");

  // Cookie will only be modifiable at backend not in the frontend
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User Logged In Successfully!!"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      }
    },
    {
      new: true // return response mein updated value milegi
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, {}, "User logout Successfully!!")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }
  try {
    // Verify Token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    // Find user in DB 
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, " Refresh token expired");
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      )
  } catch (error) {
    throw new ApiError(error?.message || "Something went wrong");
  }


})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, {}, "Password updated successfully")
  )
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, req.user, "Information fetched successfully")
  )
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are must!!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      }
    },
    { new: true } // This will return the updated user
  ).select("-password");

  return res.status(200).json(
    new ApiResponse(200, user, "Information updated successfully")
  )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  console.log(req.body);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(404, "Avatar file not found !!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Avatar file not uploaded on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      }
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(
    new ApiResponse(200, "Avatar file successfully updated")
  );
})

const updateUsercoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(404, "Cover Image file not found");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "CoverImage file not uploaded on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      }
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(
    new ApiResponse(200, "CoverImage file successfully updated")
  );
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUsercoverImage }
