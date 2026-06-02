require('dotenv').config()
const app = require('./src/app')
const connectToDB = require('./src/config/database')
const { generateResumePdf } = require('./src/services/ai.service')

const resume = `Name: Rahul Sharma
Education: B.Tech in Computer Science, 2025
Skills: C++, Java, Data Structures, Algorithms, Basic React
Projects:
Student Management System (Java, MySQL)
Portfolio Website (React)
Experience: Internship at a startup (2 months, backend APIs)
Achievements: Solved 300+ DSA problems on LeetCode`

const jobDescription = `Role: Junior Software Engineer
Requirements:
Strong in Data Structures & Algorithms
Experience with Java/Python
Basic frontend knowledge (React preferred)
Good communication skills
Internship experience is a plus`

const selfDescription = `I am a passionate problem solver with strong DSA skills. I enjoy building scalable backend systems 
                        and learning new technologies. I am a quick learner and a team player.`

//generateResumePdf({ resume, selfDescription, jobDescription }) 
connectToDB();

app.listen(3000, () => {
    console.log("server is running on port 3000")
})