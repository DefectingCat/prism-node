import bcryptjs from 'bcryptjs';
import type { Context } from 'hono';
import { z } from 'zod';
import { database } from '../utils/database';
import logger from '../utils/logger';

// Define Zod schema for User validation
const UserSchema = z.object({
  username: z.string().min(1, 'Username must be a non-empty string').trim(),
  email: z.string().email('Email must be a valid email address').trim(),
  password: z
    .string()
    .min(8, 'Password must be a string of at least 8 characters'),
});

/**
 * User API handler class
 * Provides HTTP endpoints for user management
 */
export class UserHandler {
  /**
   * Creates a new user
   *
   * @param c - Hono context object
   * @returns JSON response with user creation result
   */
  async createUser(c: Context) {
    try {
      // Validate JSON body using Zod schema
      const validatedData = UserSchema.parse(await c.req.json());

      // Destructure validated data
      const { username, email, password } = validatedData;

      // Hash the password with bcryptjs
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      // Create user object with hashed password
      const user = {
        username,
        email,
        password: hashedPassword,
      };

      // Insert user into database
      const userId = await database.insertUser(user);

      if (!userId) {
        return c.json(
          {
            success: false,
            error: 'User with the same username or email already exists',
          },
          400,
        );
      }

      const newUser = {
        id: userId,
        email: user.email,
        username: user.username,
        createdAt: new Date(),
      };

      logger.info('User created:', newUser);

      return c.json(
        {
          success: true,
          data: newUser,
        },
        201,
      );
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: 'Validation failed',
            details: error.issues.map((issue) => issue.message),
          },
          400,
        );
      }

      logger.error('Failed to create user:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to create user',
        },
        500,
      );
    }
  }
}

// Export a singleton instance
export const userHandler = new UserHandler();
