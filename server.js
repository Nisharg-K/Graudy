// File structure for the Student Management System

// server.js - Main server file
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'student-management-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
mongoose.connect('mongodb://localhost:27017/studentManagementDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
// models/User.js
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher'], default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', UserSchema);

// models/Student.js
const StudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  dateOfBirth: Date,
  gender: String,
  address: String,
  class: String,
  enrollmentDate: { type: Date, default: Date.now },
  photo: String,
  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', StudentSchema);

// models/Course.js
const CourseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, unique: true },
  courseName: { type: String, required: true },
  description: String,
  credits: Number,
  teacher: String
});

const Course = mongoose.model('Course', CourseSchema);

// models/Registration.js
const RegistrationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  registeredOn: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', RegistrationSchema);

// models/Fee.js
const FeeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: String,
  description: String,
  status: { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' }
});

const Fee = mongoose.model('Fee', FeeSchema);

// models/Attendance.js
const AttendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' }
});

const Attendance = mongoose.model('Attendance', AttendanceSchema);

// models/Exam.js
const ExamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  totalMarks: { type: Number, required: true },
  description: String
});

const Exam = mongoose.model('Exam', ExamSchema);

// models/ExamResult.js
const ExamResultSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  marksObtained: { type: Number, required: true },
  remarks: String
});

const ExamResult = mongoose.model('ExamResult', ExamResultSchema);

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

// Routes

// Auth routes
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(400).render('login', { error: 'Invalid username or password' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).render('login', { error: 'Invalid username or password' });
    }
    
    req.session.userId = user._id;
    req.session.userRole = user.role;
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('login', { error: 'Internal server error' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const studentsCount = await Student.countDocuments();
    const coursesCount = await Course.countDocuments();
    const examsCount = await Exam.countDocuments();
    const pendingFeesCount = await Fee.countDocuments({ status: 'pending' });
    
    res.render('dashboard', {
      studentsCount,
      coursesCount,
      examsCount,
      pendingFeesCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Student routes
app.get('/students', isAuthenticated, async (req, res) => {
  try {
    let query = {};
    const { search, searchBy } = req.query;
    
    if (search) {
      if (searchBy === 'id') {
        query.studentId = { $regex: search, $options: 'i' };
      } else if (searchBy === 'class') {
        query.class = { $regex: search, $options: 'i' };
      } else {
        // Default to search by name
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }
    }
    
    const students = await Student.find(query).sort({ createdAt: -1 });
    res.render('students/index', { students, search, searchBy });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/students/add', isAuthenticated, (req, res) => {
  res.render('students/add');
});

app.post('/students/add', isAuthenticated, async (req, res) => {
  try {
    const {
      studentId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      class: studentClass
    } = req.body;
    
    // Check if student ID already exists
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      return res.render('students/add', {
        error: 'Student ID already exists',
        formData: req.body
      });
    }
    
    const student = new Student({
      studentId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      class: studentClass
    });
    
    await student.save();
    res.redirect('/students');
  } catch (error) {
    console.error(error);
    res.status(500).render('students/add', {
      error: 'Failed to add student',
      formData: req.body
    });
  }
});

app.get('/students/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).send('Student not found');
    }
    res.render('students/edit', { student });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/students/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      class: studentClass
    } = req.body;
    
    await Student.findByIdAndUpdate(req.params.id, {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      class: studentClass
    });
    
    res.redirect('/students');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/students/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    // Also delete related data
    await Registration.deleteMany({ student: req.params.id });
    await Fee.deleteMany({ student: req.params.id });
    await Attendance.deleteMany({ student: req.params.id });
    await ExamResult.deleteMany({ student: req.params.id });
    
    res.redirect('/students');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Course routes
app.get('/courses', isAuthenticated, async (req, res) => {
  try {
    const courses = await Course.find().sort({ courseName: 1 });
    res.render('courses/index', { courses });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/courses/add', isAuthenticated, (req, res) => {
  res.render('courses/add');
});

app.post('/courses/add', isAuthenticated, async (req, res) => {
  try {
    const { courseCode, courseName, description, credits, teacher } = req.body;
    
    const existingCourse = await Course.findOne({ courseCode });
    if (existingCourse) {
      return res.render('courses/add', {
        error: 'Course code already exists',
        formData: req.body
      });
    }
    
    const course = new Course({
      courseCode,
      courseName,
      description,
      credits,
      teacher
    });
    
    await course.save();
    res.redirect('/courses');
  } catch (error) {
    console.error(error);
    res.status(500).render('courses/add', {
      error: 'Failed to add course',
      formData: req.body
    });
  }
});

// Registration routes
app.get('/registrations', isAuthenticated, async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate('student', 'studentId firstName lastName')
      .populate('course', 'courseCode courseName')
      .sort({ registeredOn: -1 });
    
    res.render('registrations/index', { registrations });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/registrations/add', isAuthenticated, async (req, res) => {
  try {
    const students = await Student.find().sort({ firstName: 1 });
    const courses = await Course.find().sort({ courseName: 1 });
    res.render('registrations/add', { students, courses });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/registrations/add', isAuthenticated, async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    
    // Check if already registered
    const existingRegistration = await Registration.findOne({
      student: studentId,
      course: courseId
    });
    
    if (existingRegistration) {
      const students = await Student.find().sort({ firstName: 1 });
      const courses = await Course.find().sort({ courseName: 1 });
      return res.render('registrations/add', {
        error: 'Student is already registered for this course',
        students,
        courses
      });
    }
    
    const registration = new Registration({
      student: studentId,
      course: courseId
    });
    
    await registration.save();
    res.redirect('/registrations');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Fee routes
app.get('/fees', isAuthenticated, async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate('student', 'studentId firstName lastName')
      .sort({ paymentDate: -1 });
    
    res.render('fees/index', { fees });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/fees/add', isAuthenticated, async (req, res) => {
  try {
    const students = await Student.find().sort({ firstName: 1 });
    res.render('fees/add', { students });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/fees/add', isAuthenticated, async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, description, status } = req.body;
    
    const fee = new Fee({
      student: studentId,
      amount,
      paymentMethod,
      description,
      status
    });
    
    await fee.save();
    res.redirect('/fees');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Attendance routes
app.get('/attendance', isAuthenticated, async (req, res) => {
  try {
    const courses = await Course.find().sort({ courseName: 1 });
    const selectedCourse = req.query.course || (courses.length > 0 ? courses[0]._id : null);
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    
    let students = [];
    let attendanceData = {};
    
    if (selectedCourse) {
      students = await Student.find().sort({ firstName: 1 });
      
      const attendances = await Attendance.find({
        course: selectedCourse,
        date: new Date(selectedDate)
      });
      
      attendances.forEach(att => {
        attendanceData[att.student.toString()] = att.status;
      });
    }
    
    res.render('attendance/index', {
      courses,
      selectedCourse,
      selectedDate,
      students,
      attendanceData
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/attendance/mark', isAuthenticated, async (req, res) => {
  try {
    const { courseId, date, attendance } = req.body;
    
    // Delete existing attendance records for this course and date
    await Attendance.deleteMany({
      course: courseId,
      date: new Date(date)
    });
    
    // Create new attendance records
    const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
      student: studentId,
      course: courseId,
      date: new Date(date),
      status
    }));
    
    await Attendance.insertMany(attendanceRecords);
    res.redirect(`/attendance?course=${courseId}&date=${date}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Exam routes
app.get('/exams', isAuthenticated, async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('course', 'courseCode courseName')
      .sort({ date: -1 });
    
    // Get count of students who appeared for each exam
    const examsWithCounts = await Promise.all(exams.map(async exam => {
      const count = await ExamResult.countDocuments({ exam: exam._id });
      return {
        ...exam.toObject(),
        studentsAppeared: count
      };
    }));
    
    res.render('exams/index', { exams: examsWithCounts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/exams/add', isAuthenticated, async (req, res) => {
  try {
    const courses = await Course.find().sort({ courseName: 1 });
    res.render('exams/add', { courses });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/exams/add', isAuthenticated, async (req, res) => {
  try {
    const { name, courseId, date, totalMarks, description } = req.body;
    
    const exam = new Exam({
      name,
      course: courseId,
      date: new Date(date),
      totalMarks,
      description
    });
    
    await exam.save();
    res.redirect('/exams');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/exams/:id/results', isAuthenticated, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('course', 'courseCode courseName');
    
    if (!exam) {
      return res.status(404).send('Exam not found');
    }
    
    const results = await ExamResult.find({ exam: exam._id })
      .populate('student', 'studentId firstName lastName');
    
    // Get students not yet added to results
    const studentsWithResults = results.map(r => r.student._id.toString());
    const studentsWithoutResults = await Student.find({
      _id: { $nin: studentsWithResults }
    }).sort({ firstName: 1 });
    
    res.render('exams/results', {
      exam,
      results,
      studentsWithoutResults
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/exams/:id/results/add', isAuthenticated, async (req, res) => {
  try {
    const { studentId, marksObtained, remarks } = req.body;
    
    const result = new ExamResult({
      exam: req.params.id,
      student: studentId,
      marksObtained,
      remarks
    });
    
    await result.save();
    res.redirect(`/exams/${req.params.id}/results`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Settings route
app.get('/settings', isAuthenticated, (req, res) => {
  res.render('settings');
});

// Create initial admin user if none exists
const createInitialAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const admin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log('Initial admin user created');
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await createInitialAdmin();
});
