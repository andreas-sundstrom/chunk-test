using Microsoft.AspNetCore.Mvc;

namespace ChunkTest.Api.Controllers
{
    public class Payload
    {
        public IFormFile File { get; set; }
    }

    [Route("api/v1/files")]
    [ApiController]
    public class FilesController : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult> CreateTempFile(string originalFilename)
        {
            int lastIndexOfDot = originalFilename.LastIndexOf('.');

            if (lastIndexOfDot == -1)
            {
                return BadRequest();
            }

            string extension = originalFilename[(lastIndexOfDot + 1)..];

            string filename = Guid.NewGuid().ToString() + "." + extension;

            string filepath = $"uploads/{filename}";
            if (!Directory.Exists("uploads"))
            {
                Directory.CreateDirectory("uploads");
            }

            System.IO.File.Create(filepath).Dispose();

            return Ok(filename);
        }

        [HttpPost]
        public async Task<ActionResult> UploadFile([FromQuery] string filename, [FromForm] Payload file)
        {
            string path = "uploads/" + filename;

            using (var stream = file.File.OpenReadStream())
            {
                if (stream.Length > int.MaxValue)
                {
                    throw new ArgumentOutOfRangeException(nameof(stream.Length));
                }

                int length = (int)stream.Length;

                using (var ms = new MemoryStream(length))
                {
                    stream.CopyTo(ms);
                    var buffer = ms.GetBuffer();

                    if (!System.IO.File.Exists(path))
                    {
                        return BadRequest("File does not exist!");
                    }
                    else
                    {
                        using (var existingFile = System.IO.File.OpenWrite(path))
                        {
                            existingFile.Seek(0, SeekOrigin.End);
                            existingFile.Write(buffer);
                        }
                    }
                }
            }

            return Ok();
        }
    }
}
