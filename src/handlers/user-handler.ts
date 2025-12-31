import bcryptjs from 'bcryptjs';
import type { Context } from 'hono';
import { database, User } from '../utils/database';
import logger from '../utils/logger';

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
      const userData = await c.req.json<User>();

      // Validate user data
      if (!userData.username || !userData.email || !userData.password) {
        return c.json(
          {
            success: false,
            error: 'Username, email, and password are required',
          },
          400,
        );
      }

      // Hash the password with bcryptjs
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(
        userData.password.toString(),
        salt,
      );

      // Create user object with hashed password
      const user = {
        username: userData.username,
        email: userData.email,
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
