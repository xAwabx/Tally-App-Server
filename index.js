const mongoose = require("mongoose");
const express = require("express");
const app = express();
const port = 4000;
var bodyParser = require("body-parser");
var cors = require("cors");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use(cors()); // Use this after the variable declaration

async function main() {
  await mongoose.connect(
    "mongodb+srv://awabsaghir:awabsaghir4231@chatapp.6dyqhoi.mongodb.net/"
  );
}
main().catch((err) => console.log("ERROR CONNECTING ", err));

//USER COLLECTION
const usersSchema = new mongoose.Schema({
  pfp: { type: String },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  groups: [{ type: String }],
});
const User = new mongoose.model("User", usersSchema);

//GROUP COLLECTION
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  desc: { type: String, required: true },
  users: [{ type: String }],
  Entries: [
    {
      userId: { type: String, required: true },
      groupId: { type: String, required: true },
      desc: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: String, default: new Date().toLocaleDateString("en-GB") },
    },
  ],
});
const Group = new mongoose.model("Group", groupSchema);

// Create User - username, email, userId, pfp
app.post("/createuser", async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const userId = req.body.userId;
  const pfp = req.body.pfp;
  const obj = { pfp: pfp, name: username, email: email, userId: userId };

  if (await User.exists({ userId: userId })) {
    res.send("A user with this Id already exists");
  } else {
    try {
      const new_user = new User(obj);
      await new_user.save();
      res.json(new_user);
    } catch (error) {
      console.log("ERROR saving", error);
      res.sendStatus();
    }
  }
});

// Get User INFO - userId
app.get("/getuser", async (req, res) => {
  const userId = req.query.userId;
  console.log(userId);
  const doc = await User.findOne({ userId: userId });
  res.json(doc);
});

// Create Group - userID, name, desc
app.post("/creategroup", async (req, res) => {
  const userId = req.body.userId;
  const name = req.body.name;
  const desc = req.body.desc;
  const obj = { name: name, desc: desc, users: userId };

  const new_group = new Group(obj);
  try {
    await new_group.save();
  } catch (error) {
    console.log("ERROR", error);
    return res.send("something went wrong");
  }

  // Updating user document with the new group
  try {
    await User.findOneAndUpdate(
      { userId: userId },
      { $push: { groups: new_group._id } }
    );
  } catch (error) {
    console.log("ERROR", error);
    return res.send("something went wrong");
  }

  res.json(new_group);
});

// Get Group - groupId
app.get("/getgroup", async (req, res) => {
  const groupId = req.query.groupId;
  const doc = await Group.findOne({ _id: groupId });
  console.log(groupId, doc);
  res.json(doc);
});

// Delete Group - groupId
app.post("/deletegroup", async (req, res) => {
  console.log("GROUP ID FOR DELETE GROUP: ", req.body.groupId);
  const groupId = req.body.groupId;
  try {
    //removing the groupId from every user
    const doc = await User.updateMany(
      { groups: groupId },
      { $pull: { groups: groupId } }
    );
    console.log(doc);

    //deleting the actual group
    const doc1 = await Group.findOneAndDelete({ _id: groupId });
    console.log("DELETED GROUP", doc1);
    res.json(doc1);
  } catch (error) {
    console.log(error);
    res.send("SOMETHING WENT WRONG: ", error);
  }
});

// Add User to Group - userId, groupId
app.post("/adduser", async (req, res) => {
  const email = req.body.email;
  const groupId = req.body.groupId;

  console.log("EMAIL: ", email);

  const user = await User.findOne({ email: email });
  const userId = user.userId;

  if (
    userId &&
    (await Group.exists({ _id: groupId })) &&
    (await User.exists({ userId: userId })) &&
    (await User.exists({ userId: userId, groups: groupId })) === null
  ) {
    try {
      doc = await Group.findOneAndUpdate(
        { _id: groupId },
        { $push: { users: userId } },
        { new: true }
      );
      await User.findOneAndUpdate(
        { email: email },
        { $push: { groups: groupId } }
      );
      res.json(doc);
    } catch (error) {
      console.log("ERROR", error);
    }
  } else {
    res.send(
      "UserId is invalid or the user with the given Id is already added to the group"
    );
  }
});

// Remove User from Group - userId, groupId
app.post("/removeuser", async (req, res) => {
  const userId = req.body.userId;
  const groupId = req.body.groupId;

  if (
    (await Group.exists({ _id: groupId })) &&
    (await User.exists({ userId: userId })) &&
    (await User.exists({ userId: userId, groups: groupId }))
  ) {
    try {
      const doc = await Group.findOneAndUpdate(
        { _id: groupId },
        { $pull: { users: userId } },
        { new: true }
      );
      await User.findOneAndUpdate(
        { userId: userId },
        { $pull: { groups: groupId } }
      );

      // returns updated group data
      res.json(doc);
    } catch (error) {
      console.log("ERROR while removing user from group", error);
    }
  } else {
    res.send("The groupId or userId is invalid");
  }
});

//Add Entry to Group - userId, groupId, desc, duration
app.post("/addentry", async (req, res) => {
  const userId = req.body.userId;
  const groupId = req.body.groupId;
  const desc = req.body.desc;
  const duration = req.body.duration;
  const obj = {
    userId: userId,
    groupId: groupId,
    desc: desc,
    duration: duration,
  };

  if (
    (await Group.exists({ _id: groupId })) &&
    (await User.exists({ userId: userId })) &&
    (await User.exists({ userId: userId, groups: groupId }))
  ) {
    try {
      const doc = await Group.findOneAndUpdate(
        { _id: groupId },
        { $push: { Entries: obj } },
        { new: true }
      );
      res.json(doc);
    } catch (error) {
      console.log("ERROR posting entry", error);
      return res.send("something went wrong");
    }
  } else {
    res.send("The groupId or userId is invalid");
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
