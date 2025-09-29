/*
create .env file
.env content -----> 

ORG=MprestEA
PAT=
USER_TO_ADD="shacharo@mprest.com"


in terminal run
npm i axios dotenv

*/

const axios = require("axios");
require("dotenv").config()

// === CONFIG ===
const org = process.env.ORG;                        
const pat = process.env.PAT;                        
const userEmail = process.env.USER_TO_ADD;          

// === AUTH ===
const auth = {
  headers: {
    Authorization: `Basic ${Buffer.from(":" + pat).toString("base64")}`,
  },
};

// Helper: add user to a group
async function addUserToGroup(userDescriptor, groupDescriptor) {
  const url = `https://vssps.dev.azure.com/${org}/_apis/graph/memberships/${userDescriptor}/${groupDescriptor}?api-version=7.1-preview.1`;
  await axios.put(url, {}, auth);
}

async function run() {
  try {
    // 1️⃣ Get user descriptor
    const users = await axios.get(
          `https://vssps.dev.azure.com/${org}/_apis/graph/users?api-version=7.1-preview.1`,
        auth
        );

    console.log(users, "?!")
    const user = users.data.value.find(
      (u) => u.principalName.toLowerCase() === userEmail.toLowerCase()
    );
    if (!user) throw new Error(`User ${userEmail} not found in ADO.`);
    const userDescriptor = user.descriptor;
    console.log(`✅ Found user descriptor: ${userDescriptor}`);

    // 2️⃣ Get all projects
    const projects = await axios.get(
      `https://dev.azure.com/${org}/_apis/projects?api-version=7.1-preview.4`,
      auth
    );

    for (const project of projects.data.value) {
      console.log(`\n📂 Processing project: ${project.name}`);

      // 3️⃣ Get project descriptor
      const projDescRes = await axios.get(
        `https://vssps.dev.azure.com/${org}/_apis/graph/descriptors/${project.id}?api-version=7.1-preview.1`,
        auth
      );
      const projDescriptor = projDescRes.data.value;

      // 4️⃣ Get groups in this project
      const groupsRes = await axios.get(
        `https://vssps.dev.azure.com/${org}/_apis/graph/groups?scopeDescriptor=${projDescriptor}&api-version=7.1-preview.1`,
        auth
      );

      // 4a. Add to Project Valid Users (grants access)
      const validUsersGroup = groupsRes.data.value.find((g) =>
        g.principalName.includes("Project Valid Users")
      );
      if (validUsersGroup) {
        await addUserToGroup(userDescriptor, validUsersGroup.descriptor);
        console.log(`✅ Granted access to project: ${project.name}`);
      } else {
        console.log(`⚠️ Project Valid Users group not found for ${project.name}`);
      }

      // 4b. Add to Project Administrators
      const adminGroup = groupsRes.data.value.find((g) =>
        g.principalName.includes("Project Administrators")
      );
      if (adminGroup) {
        await addUserToGroup(userDescriptor, adminGroup.descriptor);
        console.log(`✅ Added as Project Admin in: ${project.name}`);
      } else {
        console.log(`⚠️ Project Administrators group not found for ${project.name}`);
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message, err);
  }
}

run();
