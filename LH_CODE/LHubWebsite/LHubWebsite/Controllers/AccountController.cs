using Microsoft.AspNetCore.Mvc;
using LHubWebsite.Models;
using LHubWebsite.Services;
using System.Threading.Tasks;

namespace LHubWebsite.Controllers
{
    public class AccountController : Controller
    {
        private readonly RegistrationService _regService;
        public AccountController(RegistrationService regService) => _regService = regService;

        [HttpGet]
        public IActionResult Register() => View();

        [HttpPost]
        public async Task<IActionResult> Register(User user)
        {
            Console.WriteLine($"ModelState.IsValid: {ModelState.IsValid}");
            if (ModelState.IsValid)
            {
                var result = await _regService.Register(user);
                Console.WriteLine($"Registration result: {result}");
                if (result)
                    return RedirectToAction("Login"); // Redirect on success
                ModelState.AddModelError("", "Invalid data (username/email may exist)");
            }
            return View(user); // Show errors
        }

        [HttpGet]
        public IActionResult Login()
        {
            return View(new LoginViewModel());
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var isValid = await _regService.ValidateCredentialsAsync(model.Email, model.Password);
            if (isValid)
            {
                // TODO: Set authentication cookie/session here
                return RedirectToAction("Index", "Home");
            }
            else
            {
                ViewBag.ErrorMessage = "Email or password are incorrect";
                return View(model);
            }
        }
    }
}