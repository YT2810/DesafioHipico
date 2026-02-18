import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { identifier, alias } = await request.json();

    if (!identifier || !alias) {
      return NextResponse.json(
        { error: 'Identifier and alias are required' },
        { status: 400 }
      );
    }

    await connectDB();

    let user = await User.findOne({ identifier });

    if (!user) {
      user = new User({
        identifier,
        alias,
        roles: ['customer'],
        balance: {
          golds: 0,
          diamonds: 0
        }
      });
      await user.save();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        identifier: user.identifier,
        alias: user.alias,
        roles: user.roles,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get('identifier');

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier parameter is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ identifier });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        identifier: user.identifier,
        alias: user.alias,
        roles: user.roles,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
