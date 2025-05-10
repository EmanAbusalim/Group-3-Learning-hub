using System.Text.RegularExpressions;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LHubWebsite.Models;
using LHubWebsite.Data;

namespace LHubWebsite.Services
{
    public class RegistrationService
    {
        private readonly AppDbContext _db;

        // Constructor with dependency injection
        public RegistrationService(AppDbContext db)
        {
            _db = db;
        }

        // Validates username/password/email (per your LLD)
        public bool CheckCredentials(string username, string password, string email)
        {
            // Username checks (4-20 alphanumeric chars)
            if (string.IsNullOrEmpty(username) ||
                username.Length < 4 ||
                username.Length > 20 ||
                !Regex.IsMatch(username, @"^[a-zA-Z0-9]+$"))
                return false;

            // Password checks (min 8 chars with digit+letter+special char)
            if (string.IsNullOrEmpty(password) ||
                password.Length < 8 ||
                !password.Any(char.IsDigit) ||
                !password.Any(char.IsLetter) ||
                !Regex.IsMatch(password, @"[!@#$%^&*(),.?\""{}\[\]|<>]"))
                return false;

            // Email format validation
            if (string.IsNullOrEmpty(email) ||
                !new EmailAddressAttribute().IsValid(email))
                return false;

            // Check uniqueness in DB
            return !_db.Users.Any(u => u.username == username || u.email == email);
        }

        // Main registration method (updated for GUIDs)
        public async Task<bool> Register(User user)
        {
            if (!CheckCredentials(user.username, user.password, user.email))
                return false;

            // Store password as plain text
            user.password = user.password;
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ValidateCredentialsAsync(string email, string password)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.email == email);
            if (user == null)
                return false;
            // Compare plain text password (NOT SECURE, DEMO ONLY)
            return password == user.password;
        }
    }
}