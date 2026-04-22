# Auth Testing Playbook (Emergent Google OAuth)

## Setup test user via Mongo
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'tester+' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Test API
```
curl -H "Authorization: Bearer SESSION_TOKEN" $BACKEND/api/auth/me
curl -H "Authorization: Bearer SESSION_TOKEN" $BACKEND/api/projects
```

## Browser
Set `session_token` cookie via Playwright: domain=preview host, httpOnly=True, secure=True, sameSite=None.

## Notes
- Cookie is set by /api/auth/session with httpOnly, secure, samesite=none
- /api/auth/me reads cookie OR Authorization Bearer header
- All project, APK, testing endpoints require auth via get_current_user
