using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LHubWebsite.Models
{
    public class User
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid user_id { get; set; }  // Changed from int to Guid

        [Required(ErrorMessage = "invalid data")]
        [StringLength(20, MinimumLength = 4, ErrorMessage = "invalid data")]
        public string username { get; set; }

        [Required(ErrorMessage = "invalid data")]
        [EmailAddress(ErrorMessage = "invalid data")]
        public string email { get; set; }

        [Required(ErrorMessage = "invalid data")]
        [MinLength(8, ErrorMessage = "invalid data")]
        public string password { get; set; }

        public string role { get; set; } = "user"; // Default role
    }
}