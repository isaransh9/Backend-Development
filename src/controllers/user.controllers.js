import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/uploadOnCloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


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
  console.log('Email', email);

  // Validating
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
    // Iterates over the items and checks if empty or not
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Checking if user exists?
  const existeduser = User.findOne({
    $or: [{ fullName }, { email }]
  })

  if (existeduser) {
    throw new ApiError(409, "User already exists");
  }

  // ? handles if it do not exist
  // Getting the path to the file on local server which is saved by multer
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

export { registerUser, }
