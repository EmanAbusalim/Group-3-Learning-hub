using Microsoft.EntityFrameworkCore;
using LHubWebsite.Models;

namespace LHubWebsite.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }  // Maps to the "Users" table

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .ToTable("Users")  // Explicit table name
                .Property(u => u.user_id)
                .HasDefaultValueSql("NEWID()");  // Auto-GUID
        }
    }
}