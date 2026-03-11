exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { type, course, name, dob, gender, phone, email, emergency_contact, tshirt_size, group_name, participant_count } = data;

        const registrationData = {
            type: type || 'individual',
            course: course || '',
            name: name || '',
            dob: dob || '',
            gender: gender || '',
            phone: phone || '',
            email: email || '',
            emergency_contact: emergency_contact || '',
            tshirt_size: tshirt_size || '',
            group_name: group_name || '',
            participant_count: participant_count || '',
            orderId: `req-${new Date().getTime()}`,
            paymentStatus: 'pending_transfer'
        };

        // GitHub API 설정 (Netlify 환경변수 GITHUB_TOKEN 필수)
        const token = process.env.GITHUB_TOKEN;
        const owner = 'aay0909-rgb';
        const repo = 'Marathon_Project';
        const path = 'registrations.json';
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

        if(!token) {
            console.error("GITHUB_TOKEN is missing in Netlify Environment Variables");
            return {
                statusCode: 302,
                headers: { Location: '/fail.html?message=Server Configuration Error' },
                body: ''
            };
        }

        // 1. 기존 파일 가져오기
        const getRes = await fetch(url, { headers: { Authorization: `token ${token}` } });
        let fileSha = null;
        let dataWrapper = { registrants: [] };

        if (getRes.ok) {
            const fileData = await getRes.json();
            fileSha = fileData.sha;
            // Base64 디코딩
            const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
            try {
                dataWrapper = JSON.parse(contentStr);
                if (!dataWrapper.registrants) dataWrapper = { registrants: [] };
            } catch (e) {
                console.log("Failed to parse existing JSON, starting fresh.");
            }
        } else if (getRes.status !== 404) {
             throw new Error("Failed to fetch from GitHub API");
        }

        // 2. 새 참가자 추가
        dataWrapper.registrants.push(registrationData);
        const newContentBase64 = Buffer.from(JSON.stringify(dataWrapper, null, 2), 'utf8').toString('base64');

        // 3. 파일 업데이트 (Commit)
        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update registrations for ${name || group_name}`,
                content: newContentBase64,
                sha: fileSha
            })
        });

        if (!putRes.ok) {
            const errBody = await putRes.text();
            console.error("GitHub API PUT Error:", errBody);
            throw new Error('Failed to update GitHub repository');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, redirect: '/success.html' })
        };

    } catch (error) {
        console.error('Registration Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, redirect: '/fail.html' })
        };
    }
};
