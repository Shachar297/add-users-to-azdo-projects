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

async function run() {
  try {
    // 1. Get user descriptor
    const users = await axios.get(
      `https://vssps.dev.azure.com/${org}/_apis/graph/users?api-version=7.1-preview.1`,
      auth
    );

    const user = users.data.value.find(
      (u) => u.principalName.toLowerCase() === userEmail.toLowerCase()
    );
    if (!user) {
      throw new Error(`User ${userEmail} not found in ADO.`);
    }
    const userDescriptor = user.descriptor;
    console.log(`Found user descriptor: ${userDescriptor}`);

    // 2. Get all projects
    const projects = await axios.get(
      `https://dev.azure.com/${org}/_apis/projects?api-version=7.1-preview.4`,
      auth
    );

    for (const project of projects.data.value) {
      console.log(`\nProcessing project: ${project.name}`);

      // 3. Get project descriptor
      const projDescRes = await axios.get(
        `https://vssps.dev.azure.com/${org}/_apis/graph/descriptors/${project.id}?api-version=7.1-preview.1`,
        auth
      );
      const projDescriptor = projDescRes.data.value;

      // 4. Get groups in this project
      const groupsRes = await axios.get(
        `https://vssps.dev.azure.com/${org}/_apis/graph/groups?scopeDescriptor=${projDescriptor}&api-version=7.1-preview.1`,
        auth
      );

      const adminGroup = groupsRes.data.value.find((g) =>
        g.principalName.includes("Project Administrators")
      );
      if (!adminGroup) {
        console.log(`No Project Administrators group found for ${project.name}`);
        continue;
      }

      // 5. Add user to group
      const groupDescriptor = adminGroup.descriptor;
      const url = `https://vssps.dev.azure.com/${org}/_apis/graph/memberships/${userDescriptor}/${groupDescriptor}?api-version=7.1-preview.1`;

      await axios.put(url, {}, auth);
      console.log(`Added ${userEmail} as Project Admin in ${project.name}`);
    }
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

run();

