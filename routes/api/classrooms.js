const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const randomatic = require('randomatic');
const multer = require('multer');

const auth = require('../../middleware/auth');
const Classroom = require('../../models/Classroom');
const User = require('../../models/User');

const upload = multer();
// @route    GET api/classroom/
// @desc     Get currentjoinedUsers classroom
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const classrooms = await Classroom.find({ joinedUsers: req.user.id });
    if (!classrooms) {
      return res.status(400).json({ msg: 'There is no classes for this user' });
    }
    res.json(classrooms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/classroom
// @desc     Create user classroom
// @access   Private
router.post('/', auth, async (req, res) => {
  const { title, subject, subCode, cover } = req.body;
  try {
    // Using upsert option (creates new doc if no match is found):
    const author = await User.findById(req.user.id).select('-password');
    const joinedUsers = [author._id];
    const code = randomatic('aA0', 6);
    const newClassroom = new Classroom({
      author,
      title,
      subject,
      subCode,
      cover,
      code,
      joinedUsers
    });
    newClassroom.save();
    res.json(newClassroom);
  } catch (err) {
    return res.status(500).send('Server Error');
  }
});

// @route    GET api/classroom/:code
// @desc     Get classroom by code
// @access   Private
router.get('/:code', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({
      code: req.params.code,
      joinedUsers: req.user.id
    });
    if (!classroom) {
      return res.status(400).json({ msg: 'Class does not exist.' });
    }
    res.json(classroom);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/classroom/:code
// @desc     Join classroom by code
// @access   Private
router.post('/:code', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ code: req.params.code });
    if (!classroom) {
      return res.status(400).json({ msg: 'Class does not exist.' });
    }
    if (classroom.users.find((user) => req.user.id == user)) {
      return res.status(400).json({ msg: 'Class already exist.' });
    }
    const joined = await Classroom.findOneAndUpdate(
      { code: req.params.code },
      { $push: { joinedUsers: req.user.id } },
      { new: true }
    );
    res.json(joined);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    Patch api/classroom/:code
// @desc     Edit classroom by code
// @access   Private
router.patch(
  '/:code',
  auth,
  check('title', 'title is required').notEmpty(),
  check('subject', 'Subject is required').notEmpty(),
  check('subcode', 'Subcode is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // destructure the request
    const { title, subject, subcode } = req.body;
    try {
      const classroom = await Classroom.findOne({
        code: req.params.code,
        joinedUsers: req.user.id
      });
      if (!classroom) {
        return res.status(400).json({ msg: 'Class does not exist.' });
      }
      if (classroom.author._id != req.user.id) {
        return res.status(400).json({ msg: 'User not authorized.' });
      }
      const editedClass = await Classroom.findOneAndUpdate(
        { code: req.params.code },
        { $set: { title: title, subcode: subcode, subject: subject } },
        { new: true }
      );
      res.json(editedClass);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/classroom/:code
// @desc     Delete classroom by code
// @access   Private
router.delete('/:code', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({
      code: req.params.code,
      joinedUsers: req.user.id
    });
    if (!classroom) {
      return res.status(400).json({ msg: 'Class does not exist.' });
    }
    if (classroom.author._id == req.user.id) {
      await classroom.remove();
      res.json({ msg: 'Class deleted successfully.' });
    } else {
      await Classroom.findOneAndUpdate(
        { code: req.params.code },
        { $pull: { joinedUsers: { $in: req.user.id } } },
        { new: true }
      );
      res.json({ msg: 'Class leaved successfully.' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/classroom/:code/:user
// @desc     Delete user from classroom
// @access   Private

router.delete('/:code/:user', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({
      code: req.params.code,
      joinedUsers: req.user.id
    });
    if (!classroom) {
      return res.status(400).json({ msg: 'Class does not exist.' });
    }
    if (classroom.author._id != req.user.id) {
      return res.status(400).json({ msg: 'User not authorized.' });
    }
    const updatedClass = await Classroom.findOneAndUpdate(
      { code: req.params.code },
      { $pull: { joinedUsers: { $in: req.params.user } } },
      { new: true }
    );
    return res.status(200).json({ msg: 'User Removed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route    GET api/classroom/:code/:user
// @desc     Get joinedUsers from classroom
// @access   Private

router.get('/:code/users', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({
      code: req.params.code,
      joinedUsers: req.user.id
    });
    if (!classroom) {
      return res.status(400).json({ msg: 'Class does not exist.' });
    }
    constjoinedUsers = await User.find({ _id: { $in: classroom.users } }).select('-password');
    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
