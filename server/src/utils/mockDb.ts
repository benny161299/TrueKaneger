import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Contact } from '../models/Contact.js';
import { RevealLog } from '../models/RevealLog.js';
import { Report } from '../models/Report.js';
import bcrypt from 'bcrypt';

const mockUsers: any[] = [];

export const setupMockDb = () => {
  console.log('🛠️ Setting up in-memory Mock DB for testing...');

  // 1. Mock mongoose.connect
  mongoose.connect = async () => {
    console.log('🔌 Mocked MongoDB connection successful!');
    return mongoose;
  };

  // Mock disconnect
  mongoose.disconnect = async () => {
    console.log('🔌 Mocked MongoDB disconnect successful!');
  };

  // 2. Mock User model methods
  // Save helper
  const mockSave = async function(this: any) {
    if (this.email === 'admin@kaneger.com' || this.email.endsWith('@admin.com')) {
      this.role = 'admin';
    }
    const existingIndex = mockUsers.findIndex(u => u._id.toString() === this._id.toString());
    if (existingIndex > -1) {
      mockUsers[existingIndex] = this;
    } else {
      mockUsers.push(this);
    }
    return this;
  };

  User.prototype.save = mockSave;

  // Mock findOne
  User.findOne = (async (query: any) => {
    if (query.email) {
      return mockUsers.find(u => u.email === query.email) || null;
    }
    if (query.googleId) {
      return mockUsers.find(u => u.googleId === query.googleId) || null;
    }
    return null;
  }) as any;

  // Mock findById
  User.findById = (async (id: any) => {
    return mockUsers.find(u => u._id.toString() === id.toString()) || null;
  }) as any;

  // Mock create
  User.create = (async (doc: any) => {
    const newUser = new User(doc);
    newUser._id = new mongoose.Types.ObjectId();
    if (doc.password) {
      const salt = await bcrypt.genSalt(10);
      newUser.passwordHash = await bcrypt.hash(doc.password, salt);
    }
    mockUsers.push(newUser);
    return newUser;
  }) as any;

  // Mock deleteOne
  User.deleteOne = (async (query: any) => {
    if (query.email) {
      const index = mockUsers.findIndex(u => u.email === query.email);
      if (index > -1) {
        mockUsers.splice(index, 1);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }) as any;

  // 3. Mock Contact model methods
  const mockContacts: any[] = [];

  Contact.prototype.save = async function(this: any) {
    if (!this._id) {
      this._id = new mongoose.Types.ObjectId();
    }
    const existingIndex = mockContacts.findIndex(c => c._id.toString() === this._id.toString());
    if (existingIndex > -1) {
      mockContacts[existingIndex] = this;
    } else {
      mockContacts.push(this);
    }
    return this;
  };

  Contact.find = (async (query: any, projection: any) => {
    return mockContacts.map(c => {
      // Simulate MongoDB projecting only name and reportCount
      if (projection === 'name reportCount') {
        return { _id: c._id, name: c.name, reportCount: c.reportCount || 0 };
      }
      return c;
    });
  }) as any;

  Contact.findById = (async (id: any) => {
    return mockContacts.find(c => c._id.toString() === id.toString()) || null;
  }) as any;

  Contact.findOne = (async (query: any) => {
    if (query && query.name && query.phone) {
      return mockContacts.find(c => c.name === query.name && c.phone === query.phone) || null;
    }
    return null;
  }) as any;

  Contact.findByIdAndDelete = (async (id: any) => {
    const index = mockContacts.findIndex(c => c._id.toString() === id.toString());
    if (index > -1) {
      return mockContacts.splice(index, 1)[0];
    }
    return null;
  }) as any;

  // 4. Mock RevealLog model methods
  const mockRevealLogs: any[] = [];

  RevealLog.prototype.save = async function(this: any) {
    if (!this._id) {
      this._id = new mongoose.Types.ObjectId();
    }
    if (!this.timestamp) {
      this.timestamp = new Date();
    }
    mockRevealLogs.push(this);
    return this;
  };

  RevealLog.countDocuments = (async (query: any) => {
    const { userId, timestamp } = query;
    const since = timestamp && timestamp.$gte ? timestamp.$gte : new Date(0);
    return mockRevealLogs.filter(log => 
      log.userId.toString() === userId.toString() &&
      log.timestamp.getTime() >= since.getTime()
    ).length;
  }) as any;

  RevealLog.findOne = ((query: any) => {
    const exec = async () => {
      const { userId, timestamp } = query;
      const since = timestamp && timestamp.$gte ? timestamp.$gte : new Date(0);
      const filtered = mockRevealLogs.filter(log => 
        log.userId.toString() === userId.toString() &&
        log.timestamp.getTime() >= since.getTime()
      );
      filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return filtered[0] || null;
    };

    const queryObj = {
      sort: (sortOption: any) => {
        return queryObj;
      },
      then: (onfulfilled?: any, onrejected?: any) => {
        return exec().then(onfulfilled, onrejected);
      },
      exec: exec
    };

    return queryObj;
  }) as any;

  // 5. Mock Report model methods
  const mockReports: any[] = [];

  Report.prototype.save = async function(this: any) {
    if (!this._id) {
      this._id = new mongoose.Types.ObjectId();
    }
    if (!this.createdAt) {
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
    mockReports.push(this);
    return this;
  };

  Report.find = ((query: any) => {
    const exec = async () => {
      return mockReports.map(report => {
        // Safe conversion to plain object
        const reportObj = report.toObject ? report.toObject() : { ...report };
        
        // Populate contactId
        const contact = mockContacts.find(c => c._id.toString() === report.contactId.toString());
        if (contact) {
          reportObj.contactId = contact;
        }

        // Populate reportedBy
        const user = mockUsers.find(u => u._id.toString() === report.reportedBy.toString());
        if (user) {
          reportObj.reportedBy = user;
        }

        return reportObj;
      });
    };

    const queryObj = {
      populate: (path: string) => {
        return queryObj;
      },
      then: (onfulfilled?: any, onrejected?: any) => {
        return exec().then(onfulfilled, onrejected);
      },
      exec: exec
    };

    return queryObj;
  }) as any;

  Report.findByIdAndDelete = (async (id: any) => {
    const index = mockReports.findIndex(r => r._id.toString() === id.toString());
    if (index > -1) {
      return mockReports.splice(index, 1)[0];
    }
    return null;
  }) as any;

  Contact.findByIdAndUpdate = (async (id: any, update: any) => {
    const contact = mockContacts.find(c => c._id.toString() === id.toString());
    if (!contact) return null;
    if (update.$pull && update.$pull.reportedBy) {
      contact.reportedBy = contact.reportedBy.filter(
        (rId: any) => rId.toString() !== update.$pull.reportedBy.toString()
      );
    }
    if (update.$inc && update.$inc.reportCount) {
      contact.reportCount = (contact.reportCount || 0) + update.$inc.reportCount;
    }
    if (update.$set) {
      if (update.$set.name !== undefined) contact.name = update.$set.name;
      if (update.$set.phone !== undefined) contact.phone = update.$set.phone;
      if (update.$set.email !== undefined) contact.email = update.$set.email;
    }
    return contact;
  }) as any;
};
